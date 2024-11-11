package org.example;

import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

public class App {

    public static String getGreeting() {
        return "Hello World!";
    }

    public static int calculate(int a, int b) {
        return a + b;
    }

    public static String extractGEO(String geoString) {
        JSONObject jsonObject = new JSONObject(geoString);
        String geoCode = jsonObject.getString("geo");

        Map<String, String> geoMap = new HashMap<>();
        geoMap.put("US", "USA");
        geoMap.put("KN", "KNA");

        return geoMap.getOrDefault(geoCode, "UNKNOWN");
    }
}