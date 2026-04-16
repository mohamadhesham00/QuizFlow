import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export const getCloudinaryPublicIdFromUrl = (url?: string): string | null => {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/upload/")
  ) {
    return null;
  }

  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) {
    return null;
  }

  const tail = url.substring(uploadIndex + "/upload/".length);
  const withoutTransforms = tail.includes("/") ? tail.split("/") : [tail];

  const filteredParts = withoutTransforms.filter((part) => {
    if (part.startsWith("v") && /^v\d+$/.test(part)) {
      return false;
    }
    if (
      part.includes(",") ||
      part.startsWith("c_") ||
      part.startsWith("w_") ||
      part.startsWith("h_")
    ) {
      return false;
    }
    return true;
  });

  const pathWithExt = filteredParts.join("/");
  const lastDot = pathWithExt.lastIndexOf(".");
  if (lastDot === -1) {
    return pathWithExt || null;
  }

  return pathWithExt.substring(0, lastDot);
};

export const deleteCloudinaryImageByUrl = async (
  url?: string,
): Promise<void> => {
  const publicId = getCloudinaryPublicIdFromUrl(url);
  if (!publicId) {
    return;
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  if (result.result !== "ok" && result.result !== "not found") {
    const error = new Error("Failed to delete image from Cloudinary");
    (error as Error & { statusCode?: number }).statusCode = 500;
    throw error;
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "quizflow/questions",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  } as never,
});

export const upload = multer({ storage });
