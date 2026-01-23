import { UuidUtils } from "./UuidUtils";

function test() {
    console.log("--- Cocos UUID Compression Test ---");
    const fullUuid = "88215737-b8dd-4241-94e0-34659c5dd844";
    const expected = "88215c3uN1CQZTgNGWcXdhE";
    const compressed = UuidUtils.compressUuid(fullUuid);

    console.log(`Full:       ${fullUuid}`);
    console.log(`Expected:   ${expected}`);
    console.log(`Compressed: ${compressed}`);

    if (compressed === expected) {
        console.log("✅ Success!");
    } else {
        console.log("❌ Failed (Mapping implementation might need refinement)");
    }
}

test();
