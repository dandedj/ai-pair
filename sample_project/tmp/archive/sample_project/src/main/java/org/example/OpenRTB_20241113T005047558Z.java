package org.example;

import org.json.JSONObject;

public class OpenRTB {

    private int coppa;
    private int width;
    private int height;

    public void fromJson(String json) {
        JSONObject jsonObj = new JSONObject(json);
        this.coppa = jsonObj.getJSONObject("regs").getInt("coppa");
        this.width = jsonObj.getJSONArray("imp").getJSONObject(0).getJSONObject("banner").getInt("w");
        this.height = jsonObj.getJSONArray("imp").getJSONObject(0).getJSONObject("banner").getInt("h");
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