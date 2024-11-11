package org.example;

import org.json.JSONObject;

public class App {
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
        if (geoObject instanceof JSONObject) {
            JSONObject geoJson = (JSONObject) geoObject;
            if (geoJson.has("country")) {
                return geoJson.getString("country");
            }
        }
        return (geoObject != null) ? geoObject.toString() : "";
    }

    public static void main(String[] args) {
        System.out.println(App.getGreeting());
    }
}