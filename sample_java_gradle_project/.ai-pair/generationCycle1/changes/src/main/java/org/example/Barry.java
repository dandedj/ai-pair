package org.example;

public class Barry extends PersonImpl {

    public Barry(String name, String ldap, int age) {
        super(name, ldap, age);
    }

    @Override
    public String toString() {
        return String.format("Barry{name='%s', ldap='%s', age=%d}", getName(), getLDAP(), getAge());
    }
}