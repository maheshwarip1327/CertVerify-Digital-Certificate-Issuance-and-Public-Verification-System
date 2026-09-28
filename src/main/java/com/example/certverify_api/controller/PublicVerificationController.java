package com.example.certverify_api.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.certverify_api.service.CertificateService;

import java.util.Map;

@RestController
@RequestMapping("/public")
public class PublicVerificationController {

    private final CertificateService certificateService;

    public PublicVerificationController(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    @GetMapping("/verify/{verificationCode}")
    public Map<String, Object> verifyCertificate(@PathVariable String verificationCode) {
        return certificateService.verifyCertificate(verificationCode);
    }
}