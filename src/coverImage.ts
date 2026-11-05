export async function prepareCoverImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Выберите изображение");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Не удалось открыть изображение");
  }

  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1800 / bitmap.width, 900 / bitmap.height);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось открыть изображение");
    context.fillStyle = "#302035";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.82);
    if (image.length > 3_500_000) throw new Error("Изображение слишком большое для прототипа");
    return image;
  } finally {
    bitmap.close();
  }
}
