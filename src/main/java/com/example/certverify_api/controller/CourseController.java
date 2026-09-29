package com.example.certverify_api.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import com.example.certverify_api.model.Course;
import com.example.certverify_api.repository.CourseRepository;
import com.example.certverify_api.service.CertificateService;

import java.time.LocalDateTime;
import java.util.List;

@RestController

// http://localhost:8080/courses
@RequestMapping("/courses")
public class CourseController {

    private final CourseRepository courseRepository;
    private final CertificateService certificateService;

    public CourseController(
            CourseRepository courseRepository,
            CertificateService certificateService) {

        this.courseRepository = courseRepository;
        this.certificateService = certificateService;
    }

    // 1. CREATE COURSE
    // POST http://localhost:8080/courses
    @PostMapping
    public Course createCourse(@RequestBody Course course) {

        if (course.getTitle() == null || course.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Course title is required");
        }

        if (course.getCreatedAt() == null) {
            course.setCreatedAt(LocalDateTime.now());
        }

        return courseRepository.save(course);
    }

    // 2. GET ALL COURSES
    // GET http://localhost:8080/courses
    @GetMapping
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    // 3. GET SINGLE COURSE BY ID
    // GET http://localhost:8080/courses/1
    @GetMapping("/{id}")
    public Course getCourseById(@PathVariable Long id) {

        return courseRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Course not found with ID: " + id));
    }

    // 4. UPDATE COURSE
    // PUT http://localhost:8080/courses/1
    @PutMapping("/{id}")
    public Course updateCourse(
            @PathVariable Long id,
            @RequestBody Course courseDetails) {

        if (courseDetails.getTitle() == null ||
                courseDetails.getTitle().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Course title is required");
        }

        Course course = courseRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Course not found with ID: " + id));

        course.setTitle(courseDetails.getTitle());
        course.setDescription(courseDetails.getDescription());

        return courseRepository.save(course);
    }

    // 5. DELETE COURSE
    // DELETE http://localhost:8080/courses/1
    @DeleteMapping("/{id}")
    public String deleteCourse(@PathVariable Long id) {

        certificateService.deleteCourse(id);

        return "Course with ID " + id +
                " has been deleted successfully!";
    }
}