// frontend/ai-doc-frontend/src/config.js

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://ai-doc-backend-hecs.onrender.com/api/v1";

export const PPT_THEMES = {
  "Bright Orange Modern": {
    theme_id: "ppt1",
    thumb: "/themes/img1.png",
    preview: "/themes/img1.png",
  },
  "Purple Galaxy Gradient": {
    theme_id: "ppt2",
    thumb: "/themes/img2.png",
    preview: "/themes/img2.png",
  },
  "Clean Minimal Cream": {
    theme_id: "ppt3",
    thumb: "/themes/img3.png",
    preview: "/themes/img3.png",
  },
  "Red Neon Wave": {
    theme_id: "ppt4",
    thumb: "/themes/img4.png",
    preview: "/themes/img4.png",
  },
  "Soft Grid Blue": {
    theme_id: "ppt5",
    thumb: "/themes/img5.png",
    preview: "/themes/img5.png",
  },
  "Elegant Dark Slate": {
    theme_id: "ppt6",
    thumb: "/themes/img6.png",
    preview: "/themes/img6.png",
  },
  "Tech Neon Purple": {
    theme_id: "ppt7",
    thumb: "/themes/img7.png",
    preview: "/themes/img7.png",
  },
  "Fresh Green Angle": {
    theme_id: "ppt8",
    thumb: "/themes/img8.png",
    preview: "/themes/img8.png",
  },
  "Bold Red Header": {
    theme_id: "ppt9",
    thumb: "/themes/img9.png",
    preview: "/themes/img9.png",
  },
};
