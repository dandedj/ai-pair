package org.example;

import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

public class App {
    private static final Map<String, String> countryCodes = new HashMap<>();

    static {
        countryCodes.put("US", "USA");
        countryCodes.put("KN", "KNA");
        // Add more country codes if needed
    }

    public static String getGreeting() {
        return "Hello World!";
    }

    public static int calculate(int a, int b) {
        return a + b;
    }

    public static JSONObject createJSONObject(String geoString) {
        return new JSONObject(geoString);
    }

    public static String extractGEO(String geoString) {
        JSONObject jsonObject = createJSONObject(geoString);
        Object geoObject = jsonObject.get("geo");
        if (geoObject instanceof String) {
            String geoCode = (String) geoObject;
            return countryCodes.getOrDefault(geoCode, geoCode);
        }
        return geoObject.toString();
    }
}