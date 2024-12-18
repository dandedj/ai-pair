package org.example;

import java.util.Objects;

public class PersonImpl implements Person {

    private final String name;
    private final String ldap;
    private final int age;

    public PersonImpl(String name, String ldap, int age) {
        this.name = name;
        this.ldap = ldap;
        this.age = age;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public String getLDAP() {
        return ldap;
    }

    @Override
    public int getAge() {
        return age;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (!(obj instanceof PersonImpl)) return false;
        PersonImpl other = (PersonImpl) obj;
        return age == other.age &&
                Objects.equals(name, other.name) &&
                Objects.equals(ldap, other.ldap);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, ldap, age);
    }
}