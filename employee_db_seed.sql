CREATE DATABASE employees;

USE employees;


CREATE TABLE employee(
ID INT NOT NULL AUTO_INCREMENT,
first_name VARCHAR(30) NOT NULL,
last_name VARCHAR(30) NOT NULL,
role_id int,
manager_id int,
PRIMARY KEY(ID));

CREATE TABLE role(
ID INT NOT NULL AUTO_INCREMENT,
title varchar(30) NOT NULL,
salary decimal NOT NULL,
department_id int,
PRIMARY KEY(ID));

CREATE TABLE department(
ID INT NOT NULL AUTO_INCREMENT,
name varchar(30) not null,
PRIMARY KEY(ID));