package com.example.certverify_api.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import com.example.certverify_api.model.Participant;
import com.example.certverify_api.repository.ParticipantRepository;
import com.example.certverify_api.service.CertificateService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/participants")
public class ParticipantController {

    private final ParticipantRepository participantRepository;
    private final CertificateService certificateService;

    // Constructor Injection
    public ParticipantController(
            ParticipantRepository participantRepository,
            CertificateService certificateService) {

        this.participantRepository = participantRepository;
        this.certificateService = certificateService;
    }

    // 1. CREATE PARTICIPANT
    // POST http://localhost:8080/participants
    @PostMapping
    public Participant createParticipant(
            @RequestBody Participant participant) {

        if (participant.getFullName() == null ||
                participant.getFullName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Participant full name is required");
        }

        if (participant.getEmail() == null ||
                participant.getEmail().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Participant email is required");
        }

        if (participant.getCreatedAt() == null) {
            participant.setCreatedAt(LocalDateTime.now());
        }

        return participantRepository.save(participant);
    }

    // 2. GET ALL PARTICIPANTS
    // GET http://localhost:8080/participants
    @GetMapping
    public List<Participant> getAllParticipants() {

        return participantRepository.findAll();
    }

    // 3. GET SINGLE PARTICIPANT BY ID
    // GET http://localhost:8080/participants/1
    @GetMapping("/{id}")
    public Participant getParticipantById(
            @PathVariable Long id) {

        return participantRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Participant not found with ID: " + id));
    }

    // 4. UPDATE PARTICIPANT
    // PUT http://localhost:8080/participants/1
    @PutMapping("/{id}")
    public Participant updateParticipant(
            @PathVariable Long id,
            @RequestBody Participant participantDetails) {

        if (participantDetails.getFullName() == null ||
                participantDetails.getFullName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Participant full name is required");
        }

        if (participantDetails.getEmail() == null ||
                participantDetails.getEmail().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Participant email is required");
        }

        Participant participant = participantRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Participant not found with ID: " + id));

        participant.setFullName(participantDetails.getFullName());
        participant.setEmail(participantDetails.getEmail());

        return participantRepository.save(participant);
    }

    // 5. DELETE PARTICIPANT
    // DELETE http://localhost:8080/participants/1
    @DeleteMapping("/{id}")
    public String deleteParticipant(
            @PathVariable Long id) {

        certificateService.deleteParticipant(id);

        return "Participant with ID " + id +
                " has been deleted successfully!";
    }
}