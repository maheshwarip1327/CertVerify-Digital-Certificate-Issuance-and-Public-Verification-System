package com.example.certverify_api.service;

import com.example.certverify_api.model.Certificate;
import com.example.certverify_api.model.Course;
import com.example.certverify_api.model.Participant;

import java.util.List;
import java.util.Map;

public interface CertificateService {

    Certificate issueCertificate(Long courseId, Long participantId, String customCertificateId);

    List<Certificate> getAllCertificates();

    Map<String, Object> verifyCertificate(String verificationCode);

    Certificate revokeCertificate(String certificateId, String reason);

    Map<String, Object> getCourseStatistics(Long courseId);

    Course updateCourse(Long id, Course courseDetails);

    Participant updateParticipant(Long id, Participant participantDetails);

    void deleteCourse(Long id);
    void deleteParticipant(Long id);
}