plugins {
    id("java")
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.9.3")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.9.3")
    implementation("org.json:json:20210307")
}

tasks.test {
    useJUnitPlatform()
}