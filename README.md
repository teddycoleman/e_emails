### To run: 

-clone the directory

-can run a sample script `node script.js` to search for 'app'

-If you want to reload the index, do: 

    -run `tar -xzf enron_mail_20150507.tar.gz` to create directory with all emails
    
    -update `script.js` to be `new SearchEngine(true)` and it will regenerate the files

### Methodology: 

The main idea was to loop through all the files once and create 2 indices for all the data. 

The first index was for content, where the key is the word found in the email and the value is an array of all email ids where that was located. This is an inverted index which has a small similarity to Solr docValues (except I'm not storing the number of times it shows up in the doc) and this is in the form of:

```
{
    'application': [emailId1, emailId2],
    'apple': [emailId1, emailId3],
    ...
}
```

The second index then mapped the email id to a location where it lived, so that had the form of: 

```
{
    'id1': 'filepath/fileLocation1',
    'id2': 'filepath/fileLocation2',
    ...
}
```

When the `search` function is called, it runs a regex against all relevant keys to get the appropriate terms. Thus, searching for `app` will return `application` and `apple` (although not `tapping`). The function then returns the location of all the relevant files for that search. 

### If I had more time... 

1- Performance improvements to load. I did NOT end up being able to load all emails since it was going too slowly. As such, the files that were uploaded are just for the emails for Jeff Skilling (loaded directory `./maildir/skilling-j`)

2- Search should have many more features. The features include: (a) allowing search on the to/from field or date, (b) returning to the user the sentence where the word appears, (3) adding a scoring mechanism to rank the results, (4) stem/lemmatize the emails and search term for better search results.

3- Storage Optimization. My indices get pretty big, so there's definitely room for improving the space management.
