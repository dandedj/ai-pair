package org.example;

public class Utility {
    private int radius;

    public Utility(int radius) {
        this.radius = radius;
    }

    public int getNumber() {
        return radius;
    }

    public double calculateCircumference() {
        return 2 * radius * Math.PI;
    }

    public int getDiameter() {
        return radius * 2;
    }
}