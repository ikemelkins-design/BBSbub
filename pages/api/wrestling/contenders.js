import {
  getChampion,
  getNumberOneContender,
  getTopContenders,
  updateAllContenderScores,
} from "../../../lib/wrestling/contenders";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    updateAllContenderScores();

    return res.status(200).json({
      success: true,
      champion: getChampion(),
      numberOneContender: getNumberOneContender(),
      contenders: getTopContenders(10),
    });
  } catch (error) {
    console.error("contenders route error:", error);
    return res.status(500).json({ error: error.message });
  }
}