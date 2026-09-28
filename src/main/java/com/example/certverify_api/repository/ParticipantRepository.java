package com.example.certverify_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.certverify_api.model.Participant;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {

}