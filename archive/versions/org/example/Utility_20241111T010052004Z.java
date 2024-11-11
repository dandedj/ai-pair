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
        return 2 * Math.PI * number;
    }
}