#!/usr/bin/env bash
./backend/apache-maven-3.9.6/bin/mvn clean package -DskipTests -f backend/pom.xml
cp backend/target/*.jar app.jar