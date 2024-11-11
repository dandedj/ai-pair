package org.example;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class AppTest {
    @Test
    public void testGetGreeting() {
        assertEquals("Hello World!", App.getGreeting());
    }

    @Test
    public void testCalculate() {
        assertEquals(2, App.calculate(1, 1));
        assertEquals(4, App.calculate(2, 2));
        assertEquals(6, App.calculate(3, 3));
    }

    // Check that all the extracted geos have the letter A at the end   
    @Test
    public void testExtractGEO() {
        String geoString = "{\"geo\":\"US\"}";
        assertEquals("USA", App.extractGEO(geoString));

        geoString = "{\"geo\":\"KN\"}";
        assertEquals("KNA", App.extractGEO(geoString));
    }
}