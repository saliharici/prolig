const fs = require('fs');

let doc1 = fs.readFileSync('docs/CANONICAL_ARCHITECTURE.md', 'utf8');
doc1 = doc1.replace(
  "- **Question ownership:** Question.authorId will map to User.id (the actor creating the question) to maintain a consistent unified audit and ownership chain.",
  "- **Question ownership naming rule:** A future Question record must not retain an ambiguous uthorId field if that field refers to User.id. Use the conceptual naming uthorUserId -> User.id (or another equally explicit name) to maintain a consistent unified audit and ownership chain."
);
fs.writeFileSync('docs/CANONICAL_ARCHITECTURE.md', doc1, 'utf8');

let doc2 = fs.readFileSync('docs/PILOT_V1_CONTRACT.md', 'utf8');
doc2 = doc2.replace(
  "- **BOLGE_KOORDINATORU:** Bound to an ssignedRegion (e.g., Marmara). Can only read data belonging to provinces within this region.",
  "- **BOLGE_KOORDINATORU:** Bound to an ssignedRegion (e.g., Marmara). Can only read data belonging to provinces within this region. *(Note: For Pilot V1, Bölge Koordinatörü may remain a read-oriented role unless later requirements explicitly grant assignment/management actions).* "
);
doc2 = doc2.replace(
  "- **IL_KOORDINATORU:** Bound to an ssignedProvince. Can only read data explicitly linked to their province.",
  "- **IL_KOORDINATORU:** Bound to an ssignedProvince. Can only read data explicitly linked to their province. *(Note: For Pilot V1, Ýl Koordinatörü may remain a read-oriented role unless later requirements explicitly grant assignment/management actions).* "
);
fs.writeFileSync('docs/PILOT_V1_CONTRACT.md', doc2, 'utf8');
