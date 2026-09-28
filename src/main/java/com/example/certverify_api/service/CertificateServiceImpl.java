package com.example.certverify_api.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; 
import com.example.certverify_api.model.Certificate;
import com.example.certverify_api.model.CertificateStatus;
import com.example.certverify_api.model.Course;
import com.example.certverify_api.model.Participant;
import com.example.certverify_api.repository.CertificateRepository;
import com.example.certverify_api.repository.CourseRepository;
import com.example.certverify_api.repository.ParticipantRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CertificateServiceImpl implements CertificateService {

    private static final String ALPHANUM = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CertificateRepository certificateRepository;
    private final CourseRepository courseRepository;
    private final ParticipantRepository participantRepository;

    public CertificateServiceImpl(CertificateRepository certificateRepository,
                                  CourseRepository courseRepository,
                                  ParticipantRepository participantRepository) {
        this.certificateRepository = certificateRepository;
        this.courseRepository = courseRepository;
        this.participantRepository = participantRepository;
    }

    @Override
    public Certificate issueCertificate(Long courseId, Long participantId, String customCertificateId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));

        Participant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Participant not found with ID: " + participantId));

        if (certificateRepository.existsByCertificateId(customCertificateId)) {
            throw new IllegalArgumentException("Certificate ID already exists: " + customCertificateId);
        }

        String verificationCode = generateUniqueVerificationCode();

        Certificate cert = new Certificate();
        cert.setCertificateId(customCertificateId);
        cert.setVerificationCode(verificationCode);
        cert.setCourse(course);
        cert.setParticipant(participant);
        cert.setStatus(CertificateStatus.ACTIVE);
        cert.setIssuedAt(LocalDateTime.now());

        return certificateRepository.save(cert);
    }

    @Override
    public List<Certificate> getAllCertificates() {
        return certificateRepository.findAll();
    }

    @Override
    public Map<String, Object> verifyCertificate(String verificationCode) {
        Map<String, Object> response = new HashMap<>();

        Optional<Certificate> certOpt = certificateRepository.findByVerificationCode(verificationCode);
        if (certOpt.isEmpty()) {
            certOpt = certificateRepository.findByCertificateId(verificationCode);
        }

        if (certOpt.isEmpty()) {
            response.put("valid", Boolean.FALSE);
            response.put("status", "INVALID");
            response.put("message", "No certificate found matching code: " + verificationCode);
            return response;
        }

        Certificate cert = certOpt.get();

        Map<String, Object> details = new HashMap<>();
        details.put("certificateId", cert.getCertificateId());
        details.put("verificationCode", cert.getVerificationCode());
        details.put("participantName", cert.getParticipant() != null ? cert.getParticipant().getFullName() : "N/A");
        details.put("courseTitle", cert.getCourse() != null ? cert.getCourse().getTitle() : "N/A");
        details.put("issuedAt", cert.getIssuedAt());

        if (cert.getStatus() == CertificateStatus.REVOKED) {
            response.put("valid", Boolean.FALSE);
            response.put("status", "INVALID");
            response.put("message", "Verification failed: Certificate has been revoked by authority.");
            response.put("revocationReason", cert.getRevocationReason() != null ? cert.getRevocationReason() : "Invalid Submission");
            response.put("details", details);
            return response;
        }

        response.put("valid", Boolean.TRUE);
        response.put("status", "VALID");
        response.put("message", "Certificate is authentic and active.");
        response.put("details", details);
        return response;
    }

    @Override
    public Certificate revokeCertificate(String certificateId, String reason) {
        Certificate cert = certificateRepository.findByCertificateId(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found with ID: " + certificateId));

        if (cert.getStatus() == CertificateStatus.REVOKED) {
            throw new IllegalStateException("Certificate is already in REVOKED status.");
        }

        cert.setStatus(CertificateStatus.REVOKED);
        cert.setRevocationReason(reason);
        cert.setRevokedAt(LocalDateTime.now());

        return certificateRepository.save(cert);
    }

    @Override
    public Map<String, Object> getCourseStatistics(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));

        long activeCount = certificateRepository.countByCourseIdAndStatus(courseId, CertificateStatus.ACTIVE);
        long revokedCount = certificateRepository.countByCourseIdAndStatus(courseId, CertificateStatus.REVOKED);
        long totalIssued = activeCount + revokedCount;

        Map<String, Object> stats = new HashMap<>();
        stats.put("courseId", course.getId());
        stats.put("courseTitle", course.getTitle());
        stats.put("totalIssued", Long.valueOf(totalIssued));
        stats.put("activeCount", Long.valueOf(activeCount));
        stats.put("revokedCount", Long.valueOf(revokedCount));

        return stats;
    }

    @Override
    public Course updateCourse(Long id, Course courseDetails) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + id));
                
        course.setTitle(courseDetails.getTitle());
        course.setDescription(courseDetails.getDescription());
        
        return courseRepository.save(course);
    }

    @Override
    public Participant updateParticipant(Long id, Participant participantDetails) {
        Participant participant = participantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Participant not found with ID: " + id));
                
        participant.setFullName(participantDetails.getFullName());
        participant.setEmail(participantDetails.getEmail());
        
        return participantRepository.save(participant);
    }

    @Override
    @Transactional 
    public void deleteCourse(Long id) {
        if (!courseRepository.existsById(id)) {
            throw new IllegalArgumentException("Course not found with ID: " + id);
        }

        List<Certificate> certs = certificateRepository.findAll()
                .stream()
                .filter(c -> c.getCourse() != null && c.getCourse().getId().equals(id))
                .toList();

        if (!certs.isEmpty()) {
            certificateRepository.deleteAll(certs);
        }

        courseRepository.deleteById(id);
    }

    private String generateUniqueVerificationCode() {
        String code;
        do {
            code = "VCR-" + getRandomString(8);
        } while (certificateRepository.existsByVerificationCode(code));
        return code;
    }

    private String getRandomString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHANUM.charAt(RANDOM.nextInt(ALPHANUM.length())));
        }
        return sb.toString();
    }

    public void deleteParticipant(Long id) {
    
    Participant participant = participantRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Participant not found with ID: " + id));

    
    List<Certificate> certs = certificateRepository.findAll()
            .stream()
            .filter(c -> c.getParticipant() != null && c.getParticipant().getId().equals(id))
            .toList();

    if (!certs.isEmpty()) {
        certificateRepository.deleteAll(certs);
    }

    
    participantRepository.delete(participant);
}
}