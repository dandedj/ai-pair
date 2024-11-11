import org.junit.Test;
import static org.junit.Assert.assertEquals;
import org.example.Utility;

public class UtilityTest {
    
    @Test
    public void testConstructor() {
        Utility utility = new Utility(30);
        assertEquals(30, utility.getNumber());

        assertEquals(30*30*Math.PI, utility.calculateCircumference(), 0.0001);
    }
}
