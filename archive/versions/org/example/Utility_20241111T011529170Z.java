package org.example;

public class Utility {
    private int number;

    public Utility(int number) {
        this.number = number;
    }

    public int getNumber() {
        return number;
    }

    public double calculateCircumference() {
        return number * 2 * Math.PI;
    }

    public int getDiameter() {
        return number * 2;
    }
}