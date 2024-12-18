package org.example;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Objects;

public class OpenRTB {
    private int coppa = 0;
    private int width = 0;
    private int height = 0;
    private double bidfloor = 0.0;
    private int pos = 0;
    private String os = "";
    private String domain = "";

    public OpenRTB() {
    }

    public static OpenRTB fromJson(String json) {
        OpenRTB openRTB = new OpenRTB();
        openRTB.parseFromJson(json);
        return openRTB;
    }

    private void parseFromJson(String json) {
        if (json == null || json.isEmpty()) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        try {
            JSONObject jsonObject = new JSONObject(json);
            parseRegs(jsonObject);
            parseImp(jsonObject);
            parseDevice(jsonObject);
            parseSite(jsonObject);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JSON input: " + e.getMessage(), e);
        }
    }

    private void parseRegs(JSONObject jsonObject) {
        JSONObject regsObject = jsonObject.optJSONObject("regs");
        if (regsObject != null) {
            this.coppa = regsObject.optInt("coppa", 0);
        }
    }

    private void parseImp(JSONObject jsonObject) {
        JSONArray impArray = jsonObject.optJSONArray("imp");
        if (impArray != null && impArray.length() > 0) {
            JSONObject impObject = impArray.optJSONObject(0);
            if (impObject != null) {
                this.bidfloor = impObject.optDouble("bidfloor", 0.0);

                JSONObject bannerObject = impObject.optJSONObject("banner");
                if (bannerObject != null) {
                    this.width = bannerObject.optInt("w", 0);
                    this.height = bannerObject.optInt("h", 0);
                    this.pos = bannerObject.optInt("pos", 0);
                }
            }
        }
    }

    private void parseDevice(JSONObject jsonObject) {
        JSONObject deviceObject = jsonObject.optJSONObject("device");
        if (deviceObject != null) {
            this.os = deviceObject.optString("os", "");
        }
    }

    private void parseSite(JSONObject jsonObject) {
        JSONObject siteObject = jsonObject.optJSONObject("site");
        if (siteObject != null) {
            this.domain = siteObject.optString("domain", "");
        }
    }

    public int getCoppa() {
        return coppa;
    }

    public boolean isCoppa() {
        return coppa == 1;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public int getArea() {
        return width * height;
    }

    public double getBidfloor() {
        return bidfloor;
    }

    public int getPos() {
        return pos;
    }

    public String getOs() {
        return os;
    }

    public String getDomain() {
        return domain;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (!(obj instanceof OpenRTB)) return false;
        OpenRTB other = (OpenRTB) obj;
        return coppa == other.coppa &&
               width == other.width &&
               height == other.height &&
               Double.compare(bidfloor, other.bidfloor) == 0 &&
               pos == other.pos &&
               Objects.equals(os, other.os) &&
               Objects.equals(domain, other.domain);
    }

    @Override
    public int hashCode() {
        return Objects.hash(coppa, width, height, bidfloor, pos, os, domain);
    }

    @Override
    public String toString() {
        return String.format("OpenRTB{coppa=%d, width=%d, height=%d, bidfloor=%.2f, pos=%d, os='%s', domain='%s'}",
                             coppa, width, height, bidfloor, pos, os, domain);
    }
}