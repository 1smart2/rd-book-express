const express = require("express");
const request = require("request");
const cheerio = require("cheerio");
const firstScreenSchema = require("../models/firstScreenModel");
const router = express.Router();

router.get("/pachong", async (req, res) => {
  const results = [];

  // 添加必要的基础请求头
  const options = {
    url: "https://www.xiaohongshu.com/explore",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Referer: "https://www.xiaohongshu.com/",
    },
  };

  for (let i = 0; i < 3; i++) {
    // 减少测试次数
    try {
      const { body, statusCode } = await new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
          if (error || !response || response.statusCode !== 200) {
            reject(new Error(error?.message || "Request failed"));
            return;
          }
          resolve({ body, statusCode: response.statusCode });
        });
      });

      if (statusCode === 200) {
        const $ = cheerio.load(body);
        const noteItems = $(".note-item")
          .map((index, element) => {
            const $el = $(element);
            // 修正选择器路径
            console.log(
              $el.find("div").find("a").find("img").attr("src"),
              "这是"
            );
            return {
              imagesInfo: $el.find("div").find("a").find("img").attr("src"),
              title: $el.find(".title span").text().trim(),
              authorImgSrc: $el.find(".author-avatar").attr("src"),
              authorName: $el.find(".name").text().trim(),
              count: $el.find(".count").text().trim(),
            };
          })
          .get();

        // 过滤无效数据
        const validItems = noteItems.filter(
          (item) => item.imagesInfo && item.title && item.count
        );

        if (validItems.length) {
          const savedBooks = await firstScreenSchema.insertMany(validItems);
          results.push(savedBooks);
        }
      }
    } catch (err) {
      console.error(`Request ${i + 1} failed:`, err.message);
    }
  }

  res.json(results.flat());
});

module.exports = router;