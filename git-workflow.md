# Manhattan Tourist Application Project Git Workflow
 
This project will use a **feature branch workflow**. In summary, developers create feature branches off the main branch and work only within their branch before merging the feature to the main branch. This aims to keep the main branch stable and deployable at all times. Please follow these steps.  

Wherever there is a `branch`, replace with `feature-name`, where `name` is a descriptive name eg. feature-login, feature-setup-db-connection. **Always use this naming convention for naming feature branches**. Similarly for bugfixes, use `bugfix-name-of-bugfix` eg. bugfix-login-error. Follow the steps below to create a new feature branch:

## 1. Ensure you are on the main branch

Redirect to the main branch:  
```bash
git checkout main
```  
Always pull before creating a new branch/ pushing to main branch:  
```bash
git pull origin main
``` 

## 2. Create the feature branch

To create the branch:
```bash
git checkout -b branch
``` 

This will create a branch called "branch" locally on your machine and move you inside this branch.   

To push this branch to GitHub:  

```bash
git push origin branch
```   
If you choose to push the branch this way you will need to specify the branch name with each subsequent push to this branch. Instead you may set upstream tracking for this branch:
```bash
git push -u origin branch
```
then simply use:
``` bash
git push
```
for all subsequent pushes to this branch.  

\* You may also create the feature branch locally and add/edit files within the branch before pushing the branch to GitHub. \*

## 3. Edit files locally  
Once the branch is created and pushed to GitHub, move into it and edit files locally on your machine:  

```bash
git checkout branch
```

## 4. Push to GitHub  

When done editing, commit and push to GitHub. First, add all files:   
```bash 
git add .
```
or just specific files that you altered (**preferred**):
```bash
git add filename1 filename2
```   
Next commit your changes. Always use meaningful commit messages, ideally one main message summarising the change made and a secondary more descriptive message describing the change in more detail and why it was made:  
 ```bash
 git commit -m "insert first message here" -m "insert second message here"
 ```  
Finally, push changes to GitHub. **Always push commits into your feature branch, never the main branch**:
```bash
git push origin branch
```

## 5. Merge feature branch to main branch

Once you have fully developed your feature, you can now merge the feature branch with the main branch:  
* Click **Compare & pull request** button.  
* Add a title and a short description of the changes you made. Click **Create pull request**.  
* Go to the **Pull requests** tab to see the request. At least one team member should ensure that there are no conflicts with main branch.  
* If no conflicts, click **Merge pull request**. 

The feature branch is now merged with the main branch.

## 6. Clean up feature branch

After merging, it is good practice to delete the feature branch. First move into main branch:  

```bash
git checkout main
``` 
To delete your local branch:
```bash
git branch -d branch
```  
To delete the remote branch:
```bash
git push origin --delete branch
``` 
