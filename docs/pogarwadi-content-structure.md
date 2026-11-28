# पोगरवाडी वेबसाइट — Dashboard Content Structure

हे दस्तऐवज सध्याच्या सार्वजनिक पोगरवाडी वेबसाइटमधील विभागांचा आधार घेऊन तयार केले आहे. Dashboard मध्ये प्रत्येक विभागाचे नाव, क्रम, heading, subheading आणि icon हे स्थिर (Super Admin controlled) राहतील. Village Admin फक्त त्या विभागातील बदलता येणारा मजकूर, नावे, क्रमांक, फोटो आणि यादीतील नोंदी बदलेल.

## संपादनाची रचना

| Dashboard विभाग | सार्वजनिक वेबसाइटवरील विभाग | Village Admin काय बदलू शकेल? | स्थिर ठेवायचे |
|---|---|---|---|
| 1. मुख्य बॅनर | Hero | मुख्य फोटो, मुख्य मजकूर, छोटा परिचय | विभागाचे नाव, लेआउट, बटणाचे डिझाइन |
| 2. गावाबद्दल | About | इतिहास/परिचय, नकाशाचा फोटो, LGD कोड, क्षेत्रफळ, तालुका, जिल्हा | Heading, map card layout |
| 3. ग्रामपंचायत | Gram Panchayat | सरपंच, उपसरपंच, ग्रामसेवक, सदस्य आणि महत्त्वाचे अधिकारी — नाव, पद, फोन | Section headings, card layout, icons |
| 4. शेती व शासकीय योजना | Agriculture & Schemes | सध्या अधिकृत पोर्टल्सची यादी स्थिर; बदल आवश्यक असल्यास Super Admin | अधिकृत लिंक, शीर्षके, icons |
| 5. शिक्षण | Education | शाळांची नावे, प्रकार, पत्ता, संपर्क, फोटो | Section heading आणि card layout |
| 6. आरोग्य | Health | आरोग्य सुविधा, सेवा-वर्णन, संपर्क | Section heading आणि card layout |
| 7. संस्कृती, परंपरा आणि पर्यटन | Culture & Tourism | उत्सव, परंपरा, मंदिरे, पर्यटन स्थळे — शीर्षक, वर्णन, फोटो | विभागाचे headings, icons/style |
| 8. गावाचा अभिमान | Our Pride | व्यक्तींची नावे, सन्मान, माहिती, फोटो | Section heading आणि card layout |
| 9. गावातील व्यवसाय | Business Directory | व्यवसायाचे नाव, category, पत्ता, फोन, लोकेशन लिंक, फोटो | Section heading, card layout |
| 10. संपर्क व गावाचे स्थान | Contact & Location | संपर्क तपशील, Google Maps link, कार्यालयीन माहिती | Section heading, card layout |

## प्रस्तावित JSON रचना

`village_pages.content` मध्ये पुढील विभागवार डेटा ठेवायचा. `title`, `subtitle`, `introduction`, `statistics`, `facilities`, `location` ही जुनी fields सध्याच्या live renderer साठी तात्पुरती कायम ठेवायची; नवीन dashboard migration करताना compatibility राखूनच वापरायची.

```json
{
  "hero": { "image": "", "title": "आपलं गाव, आपला अभिमान!", "subtitle": "गावाची ओळख, परंपरा, प्रगती आणि माणसांना जोडणारे आपले डिजिटल व्यासपीठ." },
  "about": { "introduction": "", "history": "", "mapImage": "", "lgdCode": "563882", "taluka": "सातारा", "district": "सातारा", "area": "583 एकर" },
  "statistics": { "population": "697", "houses": "250+", "literacyRate": "90%", "schools": "3", "healthCentres": "1" },
  "gramPanchayat": { "keyOfficials": [], "members": [], "otherOfficials": [] },
  "education": { "schools": [] },
  "health": { "services": [] },
  "cultureTourism": { "traditions": [], "places": [] },
  "villagePride": { "people": [] },
  "businesses": [],
  "contact": { "phone": "", "email": "", "address": "", "mapUrl": "" }
}
```

## महत्त्वाचे नियम

- Village Admin ला फक्त त्याच्या `village_id` शी संबंधित content edit करता येईल.
- Save केल्यावर बदल Draft म्हणून सेव्ह होतील; सार्वजनिक वेबसाइटवर आपोआप दिसणार नाहीत.
- Publish करण्याचा अधिकार सुरुवातीला Super Admin कडेच राहील.
- सार्वजनिक वेबसाइटवर फक्त Published content दाखवायचा.
- फोटो Supabase Storage मध्ये ठेवायचे; database मध्ये फक्त image path/URL ठेवायचा.
- रिकामे किंवा अप्रमाणित तपशील बनवून भरायचे नाहीत.
- मोबाईलवर सोपे editing: विभागनिहाय cards/accordion, स्पष्ट labels, मोठे buttons आणि preview.
