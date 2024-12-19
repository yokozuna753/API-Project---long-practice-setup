const express = require("express");
const bcrypt = require("bcryptjs");

const {
  Spot,
  Review,
  SpotImage,
  User,
  ReviewImage,
} = require("../../db/models");
const { check, validationResult } = require("express-validator");
const { validator } = require("validator");
const { setTokenCookie, requireAuth } = require("../../utils/auth");
const { handleValidationErrors } = require("../../utils/validation");

const { where } = require("sequelize");

const router = express.Router();

// * 1. GET  /api/reviews/current - Get all Reviews of the Current User
router.get("/current", requireAuth, async (req, res) => {
  
    const { id } = req.user;

    const reviews = await Review.findAll({
      attributes: [
        "id",
        "userId",
        "spotId",
        "review",
        "stars",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: User,
          as: "User",
          attributes: [["id", "id"], ["firstName", "firstName"], "lastName"],
        },
        {
          model: Spot,
          as: "Spot",
          attributes: {
            exclude: ["description", "createdAt", "updatedAt"],
          },
          include: [
            {
              model: SpotImage,
              as: "SpotImages",
              attributes: [["url", "previewImage"]], // Renaming the field to 'previewImage'
            },
          ],
        },
      ],
      where: { id },
    });

    const formattedReviews = reviews.map((review) => {
      const reviewObj = review.toJSON(); // Convert to plain object

      // If there are SpotImages, we want to pull the first one and assign its url as previewImage
      if (
        reviewObj.Spot &&
        reviewObj.Spot.SpotImages &&
        reviewObj.Spot.SpotImages.length > 0
      ) {
        reviewObj.Spot.previewImage = reviewObj.Spot.SpotImages[0].previewImage;
        // Remove the SpotImages array after extracting the previewImage
        delete reviewObj.Spot.SpotImages;
      }

      return reviewObj;
    });

    const reviewImages = await ReviewImage.findAll({
      where: { id },
      attributes: ["id", "url"],
    });

    formattedReviews[0].ReviewImages = reviewImages;

    return res.status(200).json({ Reviews: formattedReviews });
  
});

// ! ANOTHER ROUTE HERE
router.post("/:reviewId/images", async (req, res) => {
  try {
    let { reviewId } = req.params;
    let foundReview;
    reviewId = Number(reviewId);
    if (!isNaN(reviewId)) {
      foundReview = Review.findOne({
        where: { id: reviewId },
      });
    }

    let { url: link } = req.body;

    if (foundReview) {
      let newImage = await ReviewImage.create({
        reviewId,
        url: link,
      });
      const { id, url } = newImage;
      console.log(id, url);
      res.status(201).json({
        id,
        url,
      });
    }
  } catch (err) {}
});

module.exports = router;
