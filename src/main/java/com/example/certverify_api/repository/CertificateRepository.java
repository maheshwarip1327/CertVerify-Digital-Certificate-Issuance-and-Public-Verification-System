package com.example.certverify_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.certverify_api.model.Certificate;
import com.example.certverify_api.model.CertificateStatus;

import java.util.Optional;


public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    Optional<Certificate> findByCertificateId(String certificateId);
    Optional<Certificate> findByVerificationCode(String verificationCode);
    boolean existsByCertificateId(String certificateId);
    boolean existsByVerificationCode(String verificationCode);
    long countByCourseIdAndStatus(Long courseId, CertificateStatus status);
}