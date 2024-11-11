package org.example;

import org.json.JSONObject;

public class App {
    public static String getGreeting() {
        return "Hello World!";
    }

    public static int calculate(int a, int b) {
     
    }

    public static String getGreetingWithGeo(String geo) {
        switch (geo) {
            case "USA":
                return "Hello!";
            case "FR":
                return "Salut!";
            default:
                return "Hello!";
        }
    }
}