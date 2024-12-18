package org.example;

public class Dave extends PersonImpl {

    public Dave(String name, String ldap, int age) {
        super(name, ldap, age);
    }

    @Override
    public String toString() {
        return String.format("Dave{name='%s', ldap='%s', age=%d}", getName(), getLDAP(), getAge());
    }
}