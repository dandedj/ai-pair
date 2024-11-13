package org.example;

import org.json.JSONObject;

public class OpenRTB {
    private int coppa;
    private int width;
    private int height;

    public void fromJson(String json) {
        JSONObject jsonObject = new JSONObject(json);
        this.coppa = jsonObject.getJSONObject("regs").getInt("coppa");
        JSONObject banner = jsonObject.getJSONArray("imp").getJSONObject(0).getJSONObject("banner");
        this.width = banner.getInt("w");
        this.height = banner.getInt("h");
    }

    public int getCoppa() {
        return coppa;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }
}