export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const {
            resume,
            job
        } = req.body || {};

        if (!resume) {
            return res.status(400).json({
                error: "Resume information is required"
            });
        }

        const prompt = `
You are a career guidance assistant.

Analyze the student's resume information and optional job.

Resume:
${JSON.stringify(resume)}

Job:
${JSON.stringify(job || {})}

Give:
1. Resume-job match
2. Matching skills
3. Missing skills
4. Learning roadmap
5. Interview preparation
6. Short improvement suggestions

Keep the answer practical and suitable for an engineering student.
Do not invent experience or qualifications.
`;

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-5-mini",
                    input: prompt
                })
            }
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(errorText);

            return res.status(500).json({
                error: "AI service request failed"
            });
        }

        const data =
            await response.json();

        return res.status(200).json({
            answer: data.output_text || ""
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Career Agent failed"
        });
    }
}