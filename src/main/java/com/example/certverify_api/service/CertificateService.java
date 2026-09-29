package com.example.certverify_api.service;

import com.example.certverify_api.model.Certificate;
import com.example.certverify_api.model.Course;
import com.example.certverify_api.model.Participant;

import java.util.List;
import java.util.Map;

public interface CertificateService {

    // Certificate issuance
    Certificate issueCertificate(
            Long courseId,
            Long participantId,
            String customCertificateId
    );

    // Certificate retrieval
    List<Certificate> getAllCertificates();

    // Public certificate verification
    Map<String, Object> verifyCertificate(String verificationCode);

    // Certificate revocation
    Certificate revokeCertificate(
            String certificateId,
            String reason
    );

    // Course-wise statistics
    Map<String, Object> getCourseStatistics(Long courseId);

    // Course management
    Course updateCourse(
            Long id,
            Course courseDetails
    );

    void deleteCourse(Long id);

    // Participant management
    Participant updateParticipant(
            Long id,
            Participant participantDetails
    );

    void deleteParticipant(Long id);

    // Certificate management
    void deleteCertificate(String certificateId);
}