package com.example.certverify_api.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.certverify_api.model.Certificate;
import com.example.certverify_api.model.Course;
import com.example.certverify_api.model.Participant;
import com.example.certverify_api.repository.CourseRepository;
import com.example.certverify_api.repository.ParticipantRepository;
import com.example.certverify_api.service.CertificateService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/certificates")
public class CertificateAdminController {

    private final CertificateService certificateService;
    private final CourseRepository courseRepository;
    private final ParticipantRepository participantRepository;

    // Repositories dependency injection
    public CertificateAdminController(CertificateService certificateService,
                                      CourseRepository courseRepository,
                                      ParticipantRepository participantRepository) {
        this.certificateService = certificateService;
        this.courseRepository = courseRepository;
        this.participantRepository = participantRepository;
    }

    // 1. Issue Certificate with JSON Request Body
    // POST http://localhost:8080/certificates/issue
    @PostMapping("/issue")
    public Certificate issueCertificate(@RequestBody Map<String, Object> body) {
        if (!body.containsKey("courseId") || !body.containsKey("participantId") || !body.containsKey("customCertificateId")) {
            throw new IllegalArgumentException("Missing required fields: courseId, participantId, customCertificateId");
        }

        Long courseId = Long.valueOf(body.get("courseId").toString());
        Long participantId = Long.valueOf(body.get("participantId").toString());
        String customCertificateId = body.get("customCertificateId").toString();

        return certificateService.issueCertificate(courseId, participantId, customCertificateId);
    }

    // 2. Get All Certificates
    // GET http://localhost:8080/certificates
    @GetMapping
    public List<Certificate> getAllCertificates() {
        return certificateService.getAllCertificates();
    }

    // 3. Revoke Certificate
    // PATCH http://localhost:8080/certificates/revoke/CRT-2026-X89B2?reason=Invalid
    @PatchMapping("/revoke/{certificateId}")
    public Certificate revokeCertificate(
            @PathVariable String certificateId,
            @RequestParam(required = false, defaultValue = "Invalid Submission") String reason) {
        return certificateService.revokeCertificate(certificateId, reason);
    }

    // 4. Get Course Statistics
    // GET http://localhost:8080/certificates/stats/1
    @GetMapping("/stats/{courseId}")
    public Map<String, Object> getCourseStatistics(@PathVariable Long courseId) {
        return certificateService.getCourseStatistics(courseId);
    }

    
    // PUT http://localhost:8080/certificates/courses/1
    @PutMapping("/courses/{id}")
    public ResponseEntity<Course> updateCourse(@PathVariable Long id, @RequestBody Course courseDetails) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found with ID: " + id));
                
        course.setTitle(courseDetails.getTitle());
        course.setDescription(courseDetails.getDescription());
        
        return ResponseEntity.ok(courseRepository.save(course));
    }

    
    // PUT http://localhost:8080/certificates/participants/1
    @PutMapping("/participants/{id}")
    public ResponseEntity<Participant> updateParticipant(@PathVariable Long id, @RequestBody Participant participantDetails) {
        Participant participant = participantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Participant not found with ID: " + id));
                
        participant.setFullName(participantDetails.getFullName());
        participant.setEmail(participantDetails.getEmail());
        
        return ResponseEntity.ok(participantRepository.save(participant));
    }

    
    // DELETE http://localhost:8080/certificates/courses/1
    @DeleteMapping("/courses/{id}")
    public ResponseEntity<String> deleteCourse(@PathVariable Long id) {
        courseRepository.deleteById(id);
        return ResponseEntity.ok("Course deleted successfully");
    }
}