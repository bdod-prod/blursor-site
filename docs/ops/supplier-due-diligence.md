# AI Visibility Data Supplier Due-Diligence Questionnaire

Status: internal procurement template
Last reviewed: 2026-07-20

An API key or subscription is not enough. BLURSOR should not enable a supplier collector until the supplier answers these questions in writing and the final agreement grants the required use.

## Product and collection surface

1. Which exact product surface is measured: consumer web interface, mobile application, official API, search result, or another surface?
2. Is the collection anonymous, signed in, or tied to a paid subscription?
3. Which model, mode, search/browsing setting, country, language, city, device, and account state are used?
4. Are prompts sent verbatim? If the supplier rewrites, expands, translates, or prefixes prompts, describe the transformation.
5. Are chats fresh or stateful? Are personalization, history, memory, and cookies disabled or controlled?
6. How are citations, answer text, refusals, timeouts, and partial responses captured?
7. What retry logic is used, and can a retry create multiple billable or analytically distinct observations?

## Authority and upstream terms

8. Does the supplier use an official API, written platform permission, customer-directed browser automation, or another basis?
9. Identify the contracting entity and provide the clause or written permission that authorizes automated collection at the offered volume.
10. Does the upstream platform permit benchmarking, monitoring, storage, and customer-facing reporting?
11. Has the supplier received an account warning, suspension, cease-and-desist, or material platform complaint concerning this collection method in the previous 24 months?
12. Will the supplier notify BLURSOR before changing the collection surface or legal basis?

## Rights BLURSOR requires

13. May BLURSOR store raw answers, citations, request metadata, and screenshots? State retention limits for each.
14. May BLURSOR calculate and retain derived mentions, rankings, hashes, scores, and aggregate trends?
15. May BLURSOR display those derived results and short evidence excerpts to its own clients?
16. May BLURSOR combine the data with other provider observations in a customer-facing product?
17. May BLURSOR publish aggregate methodology and anonymized studies without naming individual users or supplier infrastructure?
18. Are white-label, resale, sublicensing, or competitor-product restrictions applicable?
19. Do the granted rights survive termination for historical derived metrics and audit records?

## Data protection and security

20. Where are requests and responses processed and stored?
21. List subprocessors and cross-border transfers relevant to Russian and international clients.
22. Are prompts or responses used for model training, supplier product improvement, or advertising?
23. What deletion, export, access-control, encryption, incident-notification, and audit controls apply?
24. Can BLURSOR prohibit personal data and confidential client material at the contract and technical levels?

## Operations and exit

25. State rate limits, concurrency, expected latency, coverage, error rate, and maintenance windows.
26. What stable identifiers make observations auditable and deduplicated?
27. How much notice applies to pricing, quota, method, and product changes?
28. What happens to stored data and customer reports after termination?
29. Can BLURSOR export all raw and derived data in a documented format?
30. What warranty, liability, indemnity, and service-credit terms apply if upstream collection is unauthorized or interrupted?

## Required contract language outcomes

The final order form or addendum must explicitly permit:

- use inside a customer-facing AI visibility service;
- storage of raw observations for the agreed audit period;
- permanent retention of lawful derived metrics and hashes;
- delivery of derived results and limited excerpts to BLURSOR clients;
- combining supplier data with other named surfaces;
- reasonable public description of the measured surface and methodology;
- export on termination and advance notice of material collection-method changes.

If the supplier will not identify the measured surface or will not grant downstream use in writing, keep the adapter `disabled`.

