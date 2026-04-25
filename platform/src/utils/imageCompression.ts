const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080
const QUALITY = 0.8
const MAX_FILE_SIZE = 2 * 1024 * 1024

export async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        return file
    }

    return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.onload = () => {
            let { width, height } = img

            if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width
                width = MAX_WIDTH
            }
            if (height > MAX_HEIGHT) {
                width = (width * MAX_HEIGHT) / height
                height = MAX_HEIGHT
            }

            canvas.width = width
            canvas.height = height

            ctx?.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'))
                        return
                    }

                    const compressedFile = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, '.webp'),
                        { type: 'image/webp' }
                    )

                    if (compressedFile.size > MAX_FILE_SIZE) {
                        canvas.toBlob(
                            (smallerBlob) => {
                                if (!smallerBlob) {
                                    resolve(compressedFile)
                                    return
                                }
                                resolve(new File(
                                    [smallerBlob],
                                    file.name.replace(/\.[^.]+$/, '.webp'),
                                    { type: 'image/webp' }
                                ))
                            },
                            'image/webp',
                            0.6
                        )
                    } else {
                        resolve(compressedFile)
                    }
                },
                'image/webp',
                QUALITY
            )
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
    })
}
