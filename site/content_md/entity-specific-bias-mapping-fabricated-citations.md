# AI visibility breaks down by entity, not just by mention count

If you only track how often a brand gets mentioned by an LLM, you miss the part that actually matters: whether the model can cite that brand correctly, consistently, and in the right context. This paper argues that AI visibility is not a single number. It is an entity-specific calibration problem, shaped by salience, source coverage, and the way a query is framed.

That matters because the same system can look “visible” on paper while still fabricating citations at very different rates across brands. The authors test that directly with a citation-forcing setup on 100 Hungarian B2B entities and then verify the returned URLs and DOIs against HTTP and Crossref.

1,400 probe runs.

## What the paper measures instead of just counting mentions

The core move here is to separate raw mentions from verified mentions. Raw mention rate is treated like recall: did the model say the entity at all? Verified mention rate is treated more like precision: when the model cites something, is the citation real?

That distinction sounds small, but it changes the measurement problem. A model can appear generous with mentions and still be bad at citation fidelity. For practitioners, that means a high mention rate is not the same thing as a trustworthy presence in AI answers.

The paper frames this as a field phenomenon. Entities become machine-recognizable through citation density, co-citation patterns, structured data, and knowledge-graph anchoring—not through self-description alone. In other words, the model’s behavior is downstream of how legible the entity is in the wider information environment.

To make that measurable, the authors introduce Per-Entity Bias Mapping, or PEBM: a ten-dimensional framework that separates retrieval inclusion, hallucination rate, citation fidelity, source authority, and parametric-retrieval lag. That is a useful shift because it forces evaluation to stay at the entity level instead of collapsing everything into a platform-level average.

## The main failure mode is salience-driven fabrication

The biggest result is that fabricated citations are not evenly distributed. Tier 1 high-salience brands produce 52.69% fabricated citations, while Tier 3 low-salience entities produce 37.87%.

That gap tells you two things at once. First, visibility metrics can be misleading because “easy” entities behave very differently from obscure ones. Second, the burden of calibration is not uniform: some entities are already machine-legible enough that the model confidently invents sources around them, while others are so weakly represented that the system often refuses to play along at all.

The paper’s platform comparison makes that second point important. GPT-4o often refused to provide sources for unfamiliar entities, which can make low-salience fabrication look lower than it really is. So if you measure only incorrect citations, you may undercount the risk for the entities that are least covered in the first place.

The practical implication is simple: aggregate citation rates will flatter brands that are already well represented and hide the calibration problem for everyone else. If you manage search visibility or brand presence, you need per-entity measurement, not a pooled average.

## Prompt framing changes the error rate

Query framing matters almost as much as the entity itself. Regulatory-framed queries elevate fabrication to 56.77%, versus 37.59% for factual citation baseline queries.

That is a big swing for a prompt-level effect. It suggests that when a query sounds official, compliant, or policy-like, the model is more likely to fill in the blanks with authority-shaped citations—even when the underlying task is still just “give me a source.”

For anyone evaluating AI answers, this is a warning about prompt design. Production prompts and evaluation prompts often differ in tone. If one asks for plain sourcing and the other asks for regulatory justification, you are not measuring the same behavior.

The paper also reports rejection-induced confabulation escalation: repeated non-acceptance of AI responses in prompt chains systematically elevates fabrication. That is especially relevant for workflows where humans keep pushing a model until it “gives a better answer.” The pressure itself can degrade citation quality.

## Why infrastructure coverage and parametric lag compound the problem

The paper argues that entity bias is not just a model issue. It also reflects an infrastructure gap. Some entities have stable identifiers, consistent naming, structured markup, and stronger presence in public knowledge graphs. Others do not. The result is that the same brand can be easy to resolve for a model in one case and nearly invisible in another.

The authors call out a Parametric-Retrieval Lag Asymmetry. Retrieval-augmented systems can reflect changes within days, but parametric memory may not catch up for twelve to twenty-four months. So even when a brand improves its presence in the broader web, a plain parametric model may keep behaving as if nothing changed.

That lag matters for interpretation. If a brand suddenly sees better retrieval coverage, the improvement may show up quickly in systems that search first. But if you rely on a base model’s internal memory, you can sit on stale behavior for a long time.

The study’s verification method is also conservative in a way that matters. It catches fabricated source failures through HTTP and Crossref checks, but it does not fully capture misattributed sources without human coding. So the reported fabrication rates are useful, but they are not the ceiling of the problem.

## What to do about it

If you care about AI visibility, stop treating it as one number. Measure citation correctness per entity, then break it again by prompt framing. A brand that looks healthy in aggregate can still be fragile in the query types that matter most.

A better operating model is to build an entity-level scorecard around the things this paper isolates: verified citations, refusal rate, source authority, infrastructure coverage, and how behavior shifts across templates. That gives you something closer to an exposure map than a vanity metric.

For teams managing brand presence in AI surfaces, the immediate move is to audit your most important entities the way this paper does: by salience tier and by prompt class. If a brand is showing up in answers but not in verified sources, or if regulatory-style prompts produce much worse citation quality, you have a calibration problem—not a visibility problem.

*Varga, Z. (2026). Per-Entity Bias Mapping for AI Visibility: Why Brand Mentions Require Entity-Specific Calibration. arXiv:2606.21595*