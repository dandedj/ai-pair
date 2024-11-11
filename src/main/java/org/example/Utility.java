package org.example;

public class Utility {
    private int number;

    public Utility(int number) {
        this.number = number;
    }

    public int getNumber() {
        return number;
    }

    public int getDiameter() {
        return number * 2;
    }

    public double calculateCircumference() {
        return 2 * Math.PI * number;
    }

    public double calculateArea() {
        return Math.PI * number * number;
    }
}