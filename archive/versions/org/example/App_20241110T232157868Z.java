package org.example;

import org.json.JSONObject;

public class App {
    public static String getGreeting() {
        return "Hello World!";
    }

    public static int calculate(int a, int b) {
        return a + b;
    }

    public static String extractGEO(String geoString) {
        JSONObject jsonObject = new JSONObject(geoString);
        String geo = jsonObject.getString("geo");
        return geo + "A";
    }
}