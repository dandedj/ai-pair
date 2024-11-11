package org.example;

import org.json.JSONObject;

public class App {
    public static String getGreeting() {
        return "Hello World!";
    }

    public static int calculate(int a, int b) {
        return a + b;
    }

    public static String getGreetingWithGeo(String geo) {
        switch (geo) {
            case "FR":
                return "Salut!";
            default:
                return "Hello!";
        }
    }

    public static String extractGEO(String geoString) {
        JSONObject json = new JSONObject(geoString);
        String geo = json.getString("geo");
        return geo + "A";
    }
}