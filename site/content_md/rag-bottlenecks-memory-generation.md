# RAG Bottlenecks Are Not Where Most Teams Look

Most RAG performance discussions center on vector database selection — which engine has the fastest approximate nearest neighbor search, which supports the most index types, which scales to the largest corpus. A paper from the University of Illinois Urbana-Champaign takes a different approach: instrument the entire pipeline, measure every stage across text, PDF, audio, and code workloads, and let the numbers determine where time actually goes.

The result is RAGPerf, an end-to-end benchmarking framework that decomposes RAG pipelines into embedding, indexing, retrieval, reranking, and generation components and profiles each against real hardware constraints. The framework itself adds 0.11% overhead to single iteration time — negligible enough that the measurements reflect the system, not the measurement apparatus.

The anchoring finding: in text query pipelines, LLM generation consumes 75% to 91% of total latency depending on model size. The vector database, the component most teams optimize first, is largely irrelevant to end-to-end speed in the most common pipeline configuration.

---

## The LLM Is Almost Always the Bottleneck — Except When It Isn't

For text pipelines, the latency breakdown is unambiguous. With Qwen7B, generation accounts for 75% of total latency. With GPT20B, 80%. With Qwen72B, 91%. At that share, shaving milliseconds off retrieval has no meaningful effect on what the user experiences.

PDF and image pipelines tell a different story. Reranking accounts for 28% to 87% of total iteration time — not because reranking is computationally expensive in isolation, but because each reranking operation requires retrieving the complete source document, which incurs an average of 90 vector database lookups. The retrieval layer becomes expensive as a side effect of the reranking algorithm, not as a direct cost.

OCR-based PDF indexing is dominated almost entirely by format conversion, which accounts for 98.2% of indexing duration on average. Average GPU utilization during OCR sits at only 10%. Adding GPU capacity to an OCR-heavy indexing pipeline changes almost nothing — the bottleneck is the OCR process itself, not compute availability.

Audio pipelines introduce their own asymmetry: database insertion accounts for up to 51% of total indexing time, and transcription model choice has a direct cost. Whisper-turbo requires approximately 612 seconds for transcription — 1.77x the 347 seconds required by Whisper-tiny. The accuracy-latency tradeoff in audio pipelines runs through the transcription model, not the vector store.

The practical implication is that bottleneck location varies by pipeline type. A profiling step that identifies which stage dominates before any optimization work begins is more valuable than any single configuration change.

---

## Memory Is the Real Constraint — Not CPU Cores

The resource sensitivity experiments produce one of the paper's clearest findings. Dropping from 128 CPU cores to 32 costs 9.7% of peak throughput. Dropping further to 8 cores costs 21.8%. CPU scaling returns diminish quickly — the pipeline is not CPU-bound under normal operating conditions.

Host memory tells the opposite story. Constraining available memory to 32 GB forces disk-based indexing and collapses throughput to 15.3% of baseline for Milvus and 37.6% for LanceDB. Retrieval latency increases 6.1x to 12.5x under those conditions. The difference between a well-provisioned and an under-provisioned host memory configuration is not a performance degradation — it is effectively a different system.

GPU memory follows a similar pattern. Reducing GPU memory to 32 GB cuts average throughput to 47.1%. At 16 GB, all GPT-20B experiments fail entirely. GPU memory is not a tuning parameter with graceful degradation; it is a hard constraint that determines which models can run at all.

The transient behavior during indexing compounds the planning problem. Inserting a 20 GB Wikipedia corpus causes host memory to spike from around 90 GB to over 220 GB, and disk write throughput peaks at 4 GB/s. Infrastructure teams sizing deployments from steady-state figures will underestimate peak requirements by a factor of more than two.

---

## Generation Model Choice Drives Quality; Vector DB Choice Mostly Doesn't

Context recall scores remain nearly identical when swapping between LanceDB and Milvus under the same generation model. The retrieval layer is not the quality lever. What changes quality is the model reading the retrieved context.

Scaling the generation model from Qwen-7B to Qwen-72B under the same LanceDB configuration improves factual consistency and accuracy scores substantially. The ceiling on answer quality is set by the generator, not the retriever.

The failure mode for small models is instructive. Milvus+QwenVL-3B achieves a context-recall of 0.52 — the retrieval system is finding relevant material — but produces an accuracy of only 0.35. The retrieved context is present; the model lacks the capacity to use it. High recall does not guarantee useful output when the generation model is undersized for the task.

LanceDB with QwenVL-32B reaches a peak PDF pipeline accuracy of 0.77 at a context-recall of 0.84. That combination — adequate retrieval paired with a generation model large enough to synthesize what it receives — represents the quality ceiling the paper documents. Neither component alone gets there.

---

## Batch Size and Index Type Have Nonlinear Sweet Spots

Batch size has a clear optimum that doesn't scale linearly. Increasing batch size from 32 to 256 yields a 3.6x throughput gain for LanceDB+Qwen7B through increased GPU parallelism. Pushing to 512 reverses this, reducing throughput by up to 21% — larger batches require proportionally more GPU memory for KV cache, and the gain from parallelism is overtaken by memory pressure.

Index type produces one of the larger configuration-level effects in the paper. The brute-force FLAT index limits end-to-end RAG throughput to 0.69 QPS. Any approximate nearest neighbor index — HNSW, IVF variants — reaches 1.68 to 1.81 QPS. That 2.4x to 2.6x improvement comes from a configuration change, not hardware.

Not all ANN indices are equivalent for operational use. HNSW demands over 100 GB of host memory and the longest build time, making it impractical for update-heavy deployments. IVF_PQ builds in 200 seconds and uses a fraction of the memory — the paper describes it as the most effective balance for memory-constrained or frequently updated knowledge bases.

GPU-based indices (GPU_CAGRA) consume significant GPU memory but deliver only marginal throughput gains. Given that GPU memory is already the binding constraint for generation model selection, indices that compete for the same resource without proportional benefit are a poor tradeoff in most configurations.

---

## Before the Next Infrastructure Decision

The paper's practical implication is a sequencing argument. Most RAG optimization work starts with the retrieval layer — index type, vector database selection, embedding model tuning. The measurements here suggest a different order.

First, establish the host memory budget. Under 32 GB, disk-based indexing dominates everything else. The vector database brand is irrelevant at that point. Second, determine which generation model the GPU memory budget can sustain — not at idle, but under the batch sizes the workload requires. Third, check whether the pipeline type is text, PDF, or audio, because bottleneck location differs across them. Only after those three questions have answers does vector database selection or index type become a meaningful variable.

For teams already running RAG in production, the indexing spike behavior warrants attention. A 90 GB to 220 GB host memory surge during corpus insertion is not visible in query-time monitoring. Capacity planning based on query-stage resource utilization will miss it.

The quality finding has a direct implication for teams considering retrieval improvements as a path to better answers: if the generation model is small, better retrieval will not close the gap. The 0.52 context-recall, 0.35 accuracy result is a ceiling imposed by the generator, not a retrieval failure.

*Li, S., Zhou, Y., Xu, Y., Chen, K., Waddington, D., Sundararaman, S., Franke, H., & Huang, J. (2026). RAGPerf: An End-to-End Benchmarking Framework for Retrieval-Augmented Generation Systems. arXiv:2603.10765*