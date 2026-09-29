package com.example.certverify_api.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.certverify_api.model.Certificate;
import com.example.certverify_api.model.CertificateStatus;
import com.example.certverify_api.model.Course;
import com.example.certverify_api.model.Participant;
import com.example.certverify_api.model.VerificationRecord;
import com.example.certverify_api.repository.CertificateRepository;
import com.example.certverify_api.repository.CourseRepository;
import com.example.certverify_api.repository.ParticipantRepository;
import com.example.certverify_api.repository.VerificationRecordRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CertificateServiceImpl implements CertificateService {

    private static final String ALPHANUM =
            "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    private static final SecureRandom RANDOM =
            new SecureRandom();

    private final CertificateRepository certificateRepository;
    private final CourseRepository courseRepository;
    private final ParticipantRepository participantRepository;
    private final VerificationRecordRepository verificationRecordRepository;

    public CertificateServiceImpl(
            CertificateRepository certificateRepository,
            CourseRepository courseRepository,
            ParticipantRepository participantRepository,
            VerificationRecordRepository verificationRecordRepository) {

        this.certificateRepository = certificateRepository;
        this.courseRepository = courseRepository;
        this.participantRepository = participantRepository;
        this.verificationRecordRepository = verificationRecordRepository;
    }

    // =========================================================
    // ISSUE CERTIFICATE
    // =========================================================

    @Override
    @Transactional
    public Certificate issueCertificate(
            Long courseId,
            Long participantId,
            String customCertificateId) {

        if (customCertificateId == null ||
                customCertificateId.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Certificate ID cannot be empty.");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Course not found with ID: " + courseId));

        Participant participant =
                participantRepository.findById(participantId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Participant not found with ID: "
                                                + participantId));

        if (certificateRepository.existsByCertificateId(
                customCertificateId.trim())) {

            throw new IllegalArgumentException(
                    "Certificate ID already exists: "
                            + customCertificateId);
        }

        String verificationCode =
                generateUniqueVerificationCode();

        Certificate cert = new Certificate();

        cert.setCertificateId(customCertificateId.trim());
        cert.setVerificationCode(verificationCode);
        cert.setCourse(course);
        cert.setParticipant(participant);
        cert.setStatus(CertificateStatus.ACTIVE);
        cert.setIssuedAt(LocalDateTime.now());

        return certificateRepository.save(cert);
    }

    // =========================================================
    // GET ALL CERTIFICATES
    // =========================================================

    @Override
    public List<Certificate> getAllCertificates() {
        return certificateRepository.findAll();
    }

    // =========================================================
    // VERIFY CERTIFICATE
    // =========================================================

    @Override
    @Transactional
    public Map<String, Object> verifyCertificate(
            String verificationCode) {

        Map<String, Object> response = new HashMap<>();

        if (verificationCode == null ||
                verificationCode.trim().isEmpty()) {

            response.put("valid", Boolean.FALSE);
            response.put("status", "INVALID");
            response.put(
                    "message",
                    "Verification code cannot be empty."
            );

            return response;
        }

        String code = verificationCode.trim();

        Optional<Certificate> certOpt =
                certificateRepository.findByVerificationCode(code);

        if (certOpt.isEmpty()) {

            response.put("valid", Boolean.FALSE);
            response.put("status", "INVALID");
            response.put(
                    "message",
                    "No certificate found matching verification code: "
                            + code
            );

            return response;
        }

        Certificate cert = certOpt.get();

        /*
         * Create verification history
         */
        VerificationRecord record =
                new VerificationRecord();

        record.setCertificate(cert);
        record.setCertificateCode(
                cert.getVerificationCode()
        );
        record.setVerifiedAt(
                LocalDateTime.now()
        );

        verificationRecordRepository.save(record);

        Map<String, Object> details =
                new HashMap<>();

        details.put(
                "certificateId",
                cert.getCertificateId()
        );

        details.put(
                "verificationCode",
                cert.getVerificationCode()
        );

        details.put(
                "participantName",
                cert.getParticipant() != null
                        ? cert.getParticipant().getFullName()
                        : "N/A"
        );

        details.put(
                "courseTitle",
                cert.getCourse() != null
                        ? cert.getCourse().getTitle()
                        : "N/A"
        );

        details.put(
                "issuedAt",
                cert.getIssuedAt()
        );

        /*
         * REVOKED certificate must always be INVALID
         */
        if (cert.getStatus() ==
                CertificateStatus.REVOKED) {

            response.put(
                    "valid",
                    Boolean.FALSE
            );

            response.put(
                    "status",
                    "INVALID"
            );

            response.put(
                    "message",
                    "Verification failed: Certificate has been revoked by authority."
            );

            response.put(
                    "revocationReason",
                    cert.getRevocationReason() != null
                            ? cert.getRevocationReason()
                            : "No reason provided"
            );

            response.put(
                    "details",
                    details
            );

            return response;
        }

        /*
         * ACTIVE certificate = VALID
         */
        response.put(
                "valid",
                Boolean.TRUE
        );

        response.put(
                "status",
                "VALID"
        );

        response.put(
                "message",
                "Certificate is authentic and active."
        );

        response.put(
                "details",
                details
        );

        return response;
    }

    // =========================================================
    // REVOKE CERTIFICATE
    // =========================================================

    @Override
    @Transactional
    public Certificate revokeCertificate(
            String certificateId,
            String reason) {

        if (certificateId == null ||
                certificateId.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Certificate ID cannot be empty.");
        }

        Certificate cert =
                certificateRepository
                        .findByCertificateId(
                                certificateId.trim()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Certificate not found with ID: "
                                                + certificateId));

        if (cert.getStatus() ==
                CertificateStatus.REVOKED) {

            throw new IllegalStateException(
                    "Certificate is already in REVOKED status.");
        }

        if (reason == null ||
                reason.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Revocation reason cannot be empty.");
        }

        cert.setStatus(
                CertificateStatus.REVOKED
        );

        cert.setRevocationReason(
                reason.trim()
        );

        cert.setRevokedAt(
                LocalDateTime.now()
        );

        return certificateRepository.save(cert);
    }

    // =========================================================
    // COURSE STATISTICS
    // =========================================================

    @Override
    public Map<String, Object> getCourseStatistics(
            Long courseId) {

        Course course =
                courseRepository.findById(courseId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Course not found with ID: "
                                                + courseId));

        long activeCount =
                certificateRepository
                        .countByCourseIdAndStatus(
                                courseId,
                                CertificateStatus.ACTIVE
                        );

        long revokedCount =
                certificateRepository
                        .countByCourseIdAndStatus(
                                courseId,
                                CertificateStatus.REVOKED
                        );

        long totalIssued =
                activeCount + revokedCount;

        Map<String, Object> stats =
                new HashMap<>();

        stats.put(
                "courseId",
                course.getId()
        );

        stats.put(
                "courseTitle",
                course.getTitle()
        );

        stats.put(
                "totalIssued",
                totalIssued
        );

        stats.put(
                "activeCount",
                activeCount
        );

        stats.put(
                "revokedCount",
                revokedCount
        );

        return stats;
    }

    // =========================================================
    // UPDATE COURSE
    // =========================================================

    @Override
    @Transactional
    public Course updateCourse(
            Long id,
            Course courseDetails) {

        Course course =
                courseRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Course not found with ID: "
                                                + id));

        if (courseDetails.getTitle() == null ||
                courseDetails.getTitle().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Course title cannot be empty.");
        }

        course.setTitle(
                courseDetails.getTitle().trim()
        );

        course.setDescription(
                courseDetails.getDescription()
        );

        return courseRepository.save(course);
    }

    // =========================================================
    // UPDATE PARTICIPANT
    // =========================================================

    @Override
    @Transactional
    public Participant updateParticipant(
            Long id,
            Participant participantDetails) {

        Participant participant =
                participantRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Participant not found with ID: "
                                                + id));

        if (participantDetails.getFullName() == null ||
                participantDetails.getFullName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Participant name cannot be empty.");
        }

        if (participantDetails.getEmail() == null ||
                participantDetails.getEmail().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Participant email cannot be empty.");
        }

        participant.setFullName(
                participantDetails
                        .getFullName()
                        .trim()
        );

        participant.setEmail(
                participantDetails
                        .getEmail()
                        .trim()
        );

        return participantRepository.save(
                participant
        );
    }

    // =========================================================
    // DELETE COURSE
    // =========================================================

    @Override
    @Transactional
    public void deleteCourse(Long id) {

        Course course =
                courseRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Course not found with ID: "
                                                + id));

        /*
         * Find certificates belonging to this course
         */
        List<Certificate> certs =
                certificateRepository.findAll()
                        .stream()
                        .filter(c ->
                                c.getCourse() != null &&
                                c.getCourse()
                                        .getId()
                                        .equals(id))
                        .toList();

        /*
         * Delete verification records first
         */
        for (Certificate cert : certs) {

            List<VerificationRecord> records =
                    verificationRecordRepository
                            .findAll()
                            .stream()
                            .filter(record ->
                                    record.getCertificate() != null &&
                                    record.getCertificate()
                                            .getId()
                                            .equals(cert.getId()))
                            .toList();

            if (!records.isEmpty()) {
                verificationRecordRepository
                        .deleteAll(records);
            }
        }

        /*
         * Delete certificates
         */
        if (!certs.isEmpty()) {
            certificateRepository.deleteAll(certs);
        }

        /*
         * Delete course
         */
        courseRepository.delete(course);
    }

    // =========================================================
    // DELETE PARTICIPANT
    // =========================================================

    @Override
    @Transactional
    public void deleteParticipant(Long id) {

        Participant participant =
                participantRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Participant not found with ID: "
                                                + id));

        /*
         * Find certificates belonging to participant
         */
        List<Certificate> certs =
                certificateRepository.findAll()
                        .stream()
                        .filter(c ->
                                c.getParticipant() != null &&
                                c.getParticipant()
                                        .getId()
                                        .equals(id))
                        .toList();

        /*
         * Delete verification records first
         */
        for (Certificate cert : certs) {

            List<VerificationRecord> records =
                    verificationRecordRepository
                            .findAll()
                            .stream()
                            .filter(record ->
                                    record.getCertificate() != null &&
                                    record.getCertificate()
                                            .getId()
                                            .equals(cert.getId()))
                            .toList();

            if (!records.isEmpty()) {
                verificationRecordRepository
                        .deleteAll(records);
            }
        }

        /*
         * Delete certificates
         */
        if (!certs.isEmpty()) {
            certificateRepository.deleteAll(certs);
        }

        /*
         * Delete participant
         */
        participantRepository.delete(participant);
    }

    // =========================================================
    // DELETE CERTIFICATE
    // =========================================================

    @Override
    @Transactional
    public void deleteCertificate(
            String certificateId) {

        if (certificateId == null ||
                certificateId.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Certificate ID cannot be empty.");
        }

        Certificate cert =
                certificateRepository
                        .findByCertificateId(
                                certificateId.trim()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Certificate not found with ID: "
                                                + certificateId));

        /*
         * Delete verification records first
         */
        List<VerificationRecord> records =
                verificationRecordRepository
                        .findAll()
                        .stream()
                        .filter(record ->
                                record.getCertificate() != null &&
                                record.getCertificate()
                                        .getId()
                                        .equals(cert.getId()))
                        .toList();

        if (!records.isEmpty()) {
            verificationRecordRepository
                    .deleteAll(records);
        }

        /*
         * Delete certificate
         */
        certificateRepository.delete(cert);
    }

    // =========================================================
    // GENERATE UNIQUE VERIFICATION CODE
    // =========================================================

    private String generateUniqueVerificationCode() {

        String code;

        do {

            code = "VCR-" +
                    getRandomString(8);

        } while (
                certificateRepository
                        .existsByVerificationCode(code)
        );

        return code;
    }

    // =========================================================
    // RANDOM STRING
    // =========================================================

    private String getRandomString(
            int length) {

        StringBuilder sb =
                new StringBuilder(length);

        for (int i = 0; i < length; i++) {

            sb.append(
                    ALPHANUM.charAt(
                            RANDOM.nextInt(
                                    ALPHANUM.length()
                            )
                    )
            );
        }

        return sb.toString();
    }
}