import org.junit.Test;
import static org.junit.Assert.assertEquals;

import org.example.Utility;

public class UtilityTest {
    
    @Test
    public void testConstructor() {
        Utility utility = new Utility(30);
        assertEquals(30, utility.getNumber());

        assertEquals(30*30*Math.PI, utility.calculateArea(), 0.0001);
    }

    @Test
    public void testGetRadius() {
        Utility utility = new Utility(30);
        assertEquals(60, utility.getDiameter());
    }

    @Test
    public void testCalculateCircumference() {
        Utility utility = new Utility(30);
        assertEquals(2*30*Math.PI, utility.calculateCircumference(), 0.0001);
    }
}
