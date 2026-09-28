package com.example.certverify_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.certverify_api.model.Course;

public interface CourseRepository extends JpaRepository<Course, Long> {

}