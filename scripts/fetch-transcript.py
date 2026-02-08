#!/usr/bin/env python3
"""Fetch YouTube transcript and output as JSON."""
import sys
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video ID required"}))
        sys.exit(1)

    video_id = sys.argv[1]

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        ytt_api = YouTubeTranscriptApi()

        # Try multiple language preferences
        try:
            transcript = ytt_api.fetch(video_id=video_id, languages=['ko', 'en'])
        except Exception:
            try:
                transcript = ytt_api.fetch(video_id=video_id, languages=['en'])
            except Exception:
                transcript = ytt_api.fetch(video_id=video_id)

        text = ' '.join([s.text for s in transcript.snippets])
        print(json.dumps({"transcript": text, "snippets": len(transcript.snippets)}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
