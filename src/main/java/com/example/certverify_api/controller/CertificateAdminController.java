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
import com.example.certverify_api.service.CertificateService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/certificates")
public class CertificateAdminController {

    private final CertificateService certificateService;

    public CertificateAdminController(
            CertificateService certificateService) {
        this.certificateService = certificateService;
    }


    
    // POST http://localhost:8080/certificates/issue
    
    @PostMapping("/issue")
    public ResponseEntity<Certificate> issueCertificate(
            @RequestBody Map<String, Object> body) {

        if (!body.containsKey("courseId")
                || !body.containsKey("participantId")
                || !body.containsKey("customCertificateId")) {

            throw new IllegalArgumentException(
                    "Missing required fields: courseId, participantId, customCertificateId");
        }

        Long courseId =
                Long.valueOf(body.get("courseId").toString());

        Long participantId =
                Long.valueOf(body.get("participantId").toString());

        String customCertificateId =
                body.get("customCertificateId")
                        .toString()
                        .trim();

        Certificate certificate =
                certificateService.issueCertificate(
                        courseId,
                        participantId,
                        customCertificateId);

        return ResponseEntity.ok(certificate);
    }


    
    // GET http://localhost:8080/certificates
    
    @GetMapping
    public ResponseEntity<List<Certificate>> getAllCertificates() {

        return ResponseEntity.ok(
                certificateService.getAllCertificates());
    }


    
    // PATCH http://localhost:8080/certificates/revoke/{certificateId}
   
    @PatchMapping ("/revoke/{certificateId}")
    public ResponseEntity<Certificate> revokeCertificate(
            @PathVariable String certificateId,
            @RequestParam(
                    required = false,
                    defaultValue = "Invalid Submission")
            String reason) {

        Certificate certificate =
                certificateService.revokeCertificate(
                        certificateId,
                        reason);

        return ResponseEntity.ok(certificate);
    }


    
    // GET http://localhost:8080/certificates/stats/{courseId}
    
    @GetMapping("/stats/{courseId}")
    public ResponseEntity<Map<String, Object>> getCourseStatistics(
            @PathVariable Long courseId) {

        return ResponseEntity.ok(
                certificateService.getCourseStatistics(courseId));
    }


    
    // PUT http://localhost:8080/certificates/courses/{id}
    
    @PutMapping("/courses/{id}")
    public ResponseEntity<Course> updateCourse(
            @PathVariable Long id,
            @RequestBody Course courseDetails) {

        Course updatedCourse =
                certificateService.updateCourse(
                        id,
                        courseDetails);

        return ResponseEntity.ok(updatedCourse);
    }


    
    // PUT http://localhost:8080/certificates/participants/{id}
    
    @PutMapping("/participants/{id}")
    public ResponseEntity<Participant> updateParticipant(
            @PathVariable Long id,
            @RequestBody Participant participantDetails) {

        Participant updatedParticipant =
                certificateService.updateParticipant(
                        id,
                        participantDetails);

        return ResponseEntity.ok(updatedParticipant);
    }


    
    // DELETE http://localhost:8080/certificates/courses/{id}
    
    @DeleteMapping("/courses/{id}")
    public ResponseEntity<String> deleteCourse(
            @PathVariable Long id) {

        certificateService.deleteCourse(id);

        return ResponseEntity.ok(
                "Course deleted successfully");
    }


    
    // DELETE http://localhost:8080/certificates/participants/{id}
    
    @DeleteMapping("/participants/{id}")
    public ResponseEntity<String> deleteParticipant(
            @PathVariable Long id) {

        certificateService.deleteParticipant(id);

        return ResponseEntity.ok(
                "Participant deleted successfully");
    }


    
    // DELETE http://localhost:8080/certificates/{certificateId}
   
    @DeleteMapping("/{certificateId}")
    public ResponseEntity<String> deleteCertificate(
            @PathVariable String certificateId) {

        certificateService.deleteCertificate(
                certificateId);

        return ResponseEntity.ok(
                "Certificate deleted successfully!");
    }
}
