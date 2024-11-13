package org.example;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class OpenRTBTest {

    private OpenRTB openRTB;

    private String test_openRTB_json = "{\n" +
            "  \"id\": \"80ce30c53c16e6ede735f123ef6e32361bfc7b22\",\n" +
            "  \"at\": 1,\n" +
            "  \"cur\": [\"USD\"],\n" +
            "  \"imp\": [{\n" +
            "    \"id\": \"1\",\n" +
            "    \"bidfloor\": 0.03,\n" +
            "    \"banner\": {\n" +
            "      \"h\": 250,\n" +
            "      \"w\": 300,\n" +
            "      \"pos\": 0\n" +
            "    }\n" +
            "  }],\n" +
            "  \"site\": {\n" +
            "    \"id\": \"102855\",\n" +
            "    \"cat\": [\"IAB3-1\"],\n" +
            "    \"domain\": \"www.example.com\",\n" +
            "    \"page\": \"http://www.example.com/article/sports123.html\",\n" +
            "    \"publisher\": {\n" +
            "      \"id\": \"8953\",\n" +
            "      \"name\": \"Example Publisher\"\n" +
            "    }\n" +
            "  },\n" +
            "  \"device\": {\n" +
            "    \"ua\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36\",\n" +
            "    \"geo\": {\n" +
            "      \"lat\": 42.3601,\n" +
            "      \"lon\": -71.0589,\n" +
            "      \"country\": \"USA\",\n" +
            "      \"city\": \"Boston\",\n" +
            "      \"region\": \"MA\",\n" +
            "      \"zip\": \"02108\"\n" +
            "    },\n" +
            "    \"ip\": \"12.34.56.78\",\n" +
            "    \"language\": \"en\",\n" +
            "    \"os\": \"Windows\",\n" +
            "    \"osv\": \"10\"\n" +
            "  },\n" +
            "  \"user\": {\n" +
            "    \"id\": \"55816b39711f9b5acf3b90e313ed29e51665623f\",\n" +
            "    \"buyeruid\": \"user123\",\n" +
            "    \"geo\": {\n" +
            "      \"country\": \"USA\"\n" +
            "    },\n" +
            "    \"ext\": {\n" +
            "      \"consent\": \"1\"\n" +
            "    }\n" +
            "  },\n" +
            "  \"regs\": {\n" +
            "    \"coppa\": 0,\n" +
            "    \"ext\": {\n" +
            "      \"gdpr\": 0\n" +
            "    }\n" +
            "  }\n" +
            "}";

    @BeforeEach
    public void setUp() {
        this.openRTB = new OpenRTB();
    }

    @Test
    public void testOpenRTB() {
        openRTB.fromJson(test_openRTB_json);
        assertEquals(0, openRTB.getCoppa());
        assertEquals(300, openRTB.getWidth());
        assertEquals(250, openRTB.getHeight());
        
    }
}
