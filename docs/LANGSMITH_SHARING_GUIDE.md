# 📊 How to Share LangSmith Results

## **Method 1: Share Trace URL** (Easiest)

### Step 1: Open the trace you want to share
1. Go to https://smith.langchain.com/
2. Click on your project
3. Click on any run/trace

### Step 2: Make it public
1. Click the **Share** button (top-right)
2. Toggle "Public" → ON
3. Copy the URL (it will look like: `https://smith.langchain.com/public/...`)

### Step 3: Share with AI
Just paste the URL in the chat! Example:
```
@https://smith.langchain.com/public/276a60df-368e-4097-85d3-cf3d1c149ca0/r
```

---

## **Method 2: Export CSV** (For bulk analysis)

### Step 1: Select runs
1. Go to your project in LangSmith
2. Check the boxes next to the runs you want to export
3. Click "Export" button

### Step 2: Download CSV
1. Choose "CSV" format
2. Click "Download"

### Step 3: Share the CSV
Upload the CSV file or paste the contents in the chat

---

## **Method 3: Screenshot** (Quick visual)

Just take a screenshot of:
- The run list (shows statuses)
- Individual trace details
- The metadata/output tabs

Then paste the image in the chat!

---

## **What to Share for Debugging:**

### For Upload Issues:
- Share the `processDocumentWithLangChain` trace
- Look for: file type, chunk count, errors

### For Query Issues:
- Share the `generateAnswer` trace
- Look for: retrieved chunks, confidence, answer

### For Slow Performance:
- Share any trace with duration > 5 seconds
- Check the "Metadata" tab for timing breakdown

---

## **Quick Checklist:**

✅ Make trace public (if sharing URL)
✅ Include the full URL
✅ Mention what you're trying to debug
✅ Note the filename/query that failed

---

## **Example Message:**

```
@https://smith.langchain.com/public/xyz123/r

This image upload failed. The status shows "Ready" in the UI 
but LangSmith shows it's still pending. Can you check what went wrong?
```

---

## **Privacy Note:**

⚠️ Only make traces public if they don't contain sensitive data!

If the trace has confidential info:
- Share a screenshot with sensitive parts redacted
- Or export CSV and remove sensitive columns

