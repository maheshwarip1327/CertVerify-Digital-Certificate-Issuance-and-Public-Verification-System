package com.example.certverify_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.certverify_api.model.VerificationRecord;

public interface VerificationRecordRepository extends JpaRepository<VerificationRecord, Long> {

}