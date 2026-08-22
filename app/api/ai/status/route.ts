const MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

export async function GET() {
  return Response.json({
    provider: "NVIDIA NIM",
    configured: Boolean(process.env.NVIDIA_API_KEY?.trim()),
    model: process.env.NVIDIA_MODEL?.trim() || MODEL,
    evidence_policy: "metadata_only",
  });
}
